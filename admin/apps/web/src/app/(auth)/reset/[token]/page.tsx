import { ResetForm } from './reset-form';

export default async function ResetPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { token } = await params;
  const { email = '' } = await searchParams;

  return <ResetForm token={token} email={email} />;
}
