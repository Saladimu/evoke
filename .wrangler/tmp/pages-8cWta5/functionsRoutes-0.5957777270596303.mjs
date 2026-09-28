import { onRequest as __API_data_js_onRequest } from "/workspace/functions/API/data.js"
import { onRequest as __API_scores_js_onRequest } from "/workspace/functions/API/scores.js"

export const routes = [
    {
      routePath: "/API/data",
      mountPath: "/API",
      method: "",
      middlewares: [],
      modules: [__API_data_js_onRequest],
    },
  {
      routePath: "/API/scores",
      mountPath: "/API",
      method: "",
      middlewares: [],
      modules: [__API_scores_js_onRequest],
    },
  ]