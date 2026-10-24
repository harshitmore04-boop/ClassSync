export function attendanceReturnPath(token:string){return '/student?session='+encodeURIComponent(token);}
export function attendanceLoginPath(token:string){return '/student-login?returnTo='+encodeURIComponent(attendanceReturnPath(token));}
