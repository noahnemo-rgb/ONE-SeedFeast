async function upload() {
  return {
    url: null,
    mimeType: null,
    error: "SeedFeast keeps uploads on this app. The external upload service is disconnected.",
  };
}

export { upload };
export default upload;
