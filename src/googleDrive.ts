export const GOOGLE_CLIENT_ID = "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com"; // Keep your working ID here

const SCOPES = "https://www.googleapis.com/auth/drive.appdata";

let tokenClient: any;

export const initGoogleAuth = (onSuccess: (accessToken: string) => void) => {
  if (typeof window !== "undefined" && (window as any).google) {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.access_token) {
          onSuccess(response.access_token);
        }
      },
    });
  }
};

export const requestGoogleLogin = () => {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: "consent" });
  } else {
    alert("Google API script not loaded yet. Please refresh.");
  }
};

export const findDataFile = async (accessToken: string) => {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='data.json'",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
};

export const loadFromDrive = async (accessToken: string, fileId: string) => {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return await res.json();
};

export const saveToDrive = async (
  accessToken: string,
  fileId: string | null,
  appData: any
) => {
  const fileContent = JSON.stringify(appData);

  if (fileId) {
    // Update existing file
    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: fileContent,
      }
    );
    return fileId;
  } else {
    // Create new file inside hidden appDataFolder
    const metadata = {
      name: "data.json",
      parents: ["appDataFolder"],
    };

    const formData = new FormData();
    formData.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    formData.append(
      "file",
      new Blob([fileContent], { type: "application/json" })
    );

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      }
    );
    const data = await res.json();
    return data.id;
  }
};