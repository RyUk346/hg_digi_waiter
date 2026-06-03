import { googleEnabled } from '@/auth';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  return <RegisterForm googleEnabled={googleEnabled} />;
}
