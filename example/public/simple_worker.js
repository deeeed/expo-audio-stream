self.onmessage = function (event) {
  console.log("Message from main thread:", event.data);
  const { data } = event;
  const { type } = data;
  const result = "result" + type; // Example task
  self.postMessage(result);
};
