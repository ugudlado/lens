import { createContext, useContext } from "react";

/** Global editing mode — true when the user has enabled "Edit mode" in the header */
export const EditingContext = createContext<boolean>(false);

export function useEditing(): boolean {
  return useContext(EditingContext);
}
