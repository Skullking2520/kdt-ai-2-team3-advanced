const HOME_URL = import.meta.env.VITE_SMISHING_HOME_URL ?? "http://localhost:8000";
const PREDICT_API_URL = import.meta.env.VITE_SMISHING_API_URL ?? "http://localhost:8000/predict";

export { HOME_URL, PREDICT_API_URL };
