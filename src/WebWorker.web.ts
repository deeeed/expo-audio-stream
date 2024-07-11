export default function createWebWorker() {
  console.log(`createWebWorker`);

  // Read the worker script as a string
  const workerBlob = new Blob(
    [
      `
        self.onmessage = function(event) {
          console.log('Message from main thread:', event.data);
          const { data } = event;
          const { type } = data;
          const result = 'result' + type; // Example task
          self.postMessage(result);
        };
      `,
    ],
    { type: "application/javascript" },
  );

  const worker = new Worker(URL.createObjectURL(workerBlob));

  return worker;
}
