import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Rol } from '../enums/rol.enum';

export interface UsuarioAutenticado {
  id: number;
  correo: string;
  rol: Rol;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => ctx.switchToHttp().getRequest().user,
);
