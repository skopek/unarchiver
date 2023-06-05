import { unarchive } from "./unarchive";

function readArrayBuffer(blob: Blob) {
  const fileReader = new FileReader();

  const promise = new Promise<ArrayBuffer>((resolve, reject) => {
    fileReader.addEventListener(
      "load",
      (event) => {
        const buffer = event.target?.result;

        if (!(buffer instanceof ArrayBuffer)) throw new Error("Error");

        resolve(buffer);
      },
      { once: true }
    );

    fileReader.addEventListener("error", reject, { once: true });
  });

  fileReader.readAsArrayBuffer(blob);

  return promise;
}

self.addEventListener("message", async (e) => {
  if (e.data instanceof File) {
    try {
      const buffer = await readArrayBuffer(e.data);
      const data = unarchive(buffer);

      self.postMessage({ type: "data", data });
    } catch (error) {
      console.error(error);
      self.postMessage({ type: "error", error: "Error! Failed to unarchive." });
    }
  }
});
