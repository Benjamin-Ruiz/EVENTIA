import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marca una ruta como accesible para visitantes (sin autenticación). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
