const HOME_URL =
  import.meta.env.VITE_SMISHING_HOME_URL ?? "http://localhost:8000";
const PREDICT_API_URL = HOME_URL + "/predict";
const REPORT_API_URL = HOME_URL + "/report";

export { HOME_URL, PREDICT_API_URL, REPORT_API_URL };
