export function redirect(url) {
  const err = new Error(`NEXT_REDIRECT: ${url}`);
  err.digest = `NEXT_REDIRECT;${url}`;
  throw err;
}
export function useRouter() {
  return { push() {}, replace() {}, refresh() {} };
}
export function usePathname() {
  return '';
}
export function useSearchParams() {
  return new URLSearchParams();
}
