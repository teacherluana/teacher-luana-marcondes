import { AuthForm } from "@/components/AuthForm";
import { StorefrontFooter, StorefrontHeader } from "@/components/Storefront";
export default function SignUpPage() { return <><StorefrontHeader /><main className="page container"><div className="auth"><AuthForm mode="signup" /></div></main><StorefrontFooter /></>; }
