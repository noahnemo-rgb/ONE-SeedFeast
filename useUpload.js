import * as React from "react";

function useUpload() {
  const upload = React.useCallback(async () => {
    return {
      error: "SeedFeast keeps uploads on this app. The external upload service is disconnected.",
    };
  }, []);

  return [upload, { loading: false }];
}

export { useUpload };
export default useUpload;
