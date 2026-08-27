import { AuthForm } from "@/components/AuthForm";
import { StorefrontFooter, StorefrontHeader } from "@/components/Storefront";
export default function NewPasswordPage() { return <><StorefrontHeader /><main className="page container"><div className="auth"><AuthForm mode="new-password" /></div></main><StorefrontFooter /></>; }
