import { IsString, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class CreateOrderItemDto {
  @IsInt()
  produtoId: number;

  @IsInt()
  @Min(1)
  quantidadeSolicitada: number;
}

export class CreateOrderDto {
  @IsString()
  codigoPedido: string;

  @IsArray()
  @ValidateNested({每一: true })
  @Type(() => CreateOrderItemDto)
  itens: CreateOrderItemDto[];
}
