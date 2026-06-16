import { SetMetadata } from '@nestjs/common';

/** Marca um endpoint como público — dispensa autenticação JWT */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
