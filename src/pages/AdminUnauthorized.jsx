import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import AuthSplitLayout from '../components/layout/AuthSplitLayout';

const AdminUnauthorized = () => {
  return (
    <AuthSplitLayout
      mode="sign-in"
      title="Admin access required"
      subtitle="This area is restricted to platform overseer accounts."
      footer={
        <>
          Return to user login? <Link to="/login">Go to sign in</Link>
        </>
      }
    >
      <div className="auth-alert auth-alert--error" role="alert">
        <ShieldAlert size={16} className="shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          Your account is signed in, but it is not allowlisted for admin control access.
        </span>
      </div>

      <div className="mt-4 flex gap-3">
        <Link to="/admin/login" className="btn-primary auth-form__submit text-center">
          Try admin login
        </Link>
        <Link to="/dashboard" className="btn-ghost auth-form__submit text-center">
          Open dashboard
        </Link>
      </div>
    </AuthSplitLayout>
  );
};

export default AdminUnauthorized;
