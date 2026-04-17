import { Navigate } from "react-router-dom";

/** Legacy route — plans live on the landing page. */
const Pricing = () => <Navigate to={{ pathname: "/", hash: "pricing" }} replace />;

export default Pricing;
