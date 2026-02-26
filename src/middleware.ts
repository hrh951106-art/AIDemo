import auth from 'next-auth/middleware'

export default auth

export const config = {
  matcher: ['/tasks/:path*', '/projects/:path*', '/users/:path*'],
}
