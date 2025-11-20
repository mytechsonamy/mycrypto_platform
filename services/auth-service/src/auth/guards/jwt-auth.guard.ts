import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Add any custom logic here before calling the parent method
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // You can throw custom exceptions here
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }

    // Attach user to request
    const request = context.switchToHttp().getRequest();
    request.user = user;

    return user;
  }
}