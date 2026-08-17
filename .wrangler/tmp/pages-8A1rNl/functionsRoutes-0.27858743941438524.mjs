import { onRequest as __API_data_js_onRequest } from "/workspace/functions/API/data.js"

export const routes = [
    {
      routePath: "/API/data",
      mountPath: "/API",
      method: "",
      middlewares: [],
      modules: [__API_data_js_onRequest],
    },
  ]