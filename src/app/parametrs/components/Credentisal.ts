
import { create, type StateCreator } from "zustand";
import { produce } from "immer";
import { persist, createJSONStorage } from "zustand/middleware";







export interface GoogleDriveType {
 
  folderId: string;
  spreadsheetId: string;
  fileId: string;
}

interface CredentialsState {
    set_data: GoogleDriveType | undefined;
    reset: () => void;
    set_credentials: (data: GoogleDriveType) => void;
}
const initial_state  :GoogleDriveType  = {
  folderId: "",
    spreadsheetId: "",
    fileId: "",
};

const GoogleIDS_callback: StateCreator<CredentialsState> = (set) => ({
  
  set_data: undefined,
    reset: () => {
    set(() => ({ set_data: initial_state })); 
  },
  set_credentials: (data: GoogleDriveType) => {
    set(
      produce((state: CredentialsState) => {
        state.set_data = data;
      })
    );
  },
});


export const useGoogleIDSstore = create<CredentialsState>()(
  persist(GoogleIDS_callback, {
    name: "GoogleIDS",
    storage: createJSONStorage(() => localStorage),
  }),
);
