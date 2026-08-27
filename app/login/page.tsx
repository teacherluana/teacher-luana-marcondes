import { AuthForm } from "@/components/AuthForm";
import { StorefrontFooter, StorefrontHeader } from "@/components/Storefront";
export default function LoginPage() { return <><StorefrontHeader /><main className="page container"><div className="auth"><AuthForm mode="login" /></div></main><StorefrontFooter /></>; }
