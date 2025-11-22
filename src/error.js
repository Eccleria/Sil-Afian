export const onShardError = (error) => {
  console.error("A websocket connection encountered an error:", error);
};

export const onUnhandledRejection = (error) => {
  console.error("Unhandled promise rejection:", error);
};
