import { IsNotEmpty, IsString } from 'class-validator';

export class ProcessNfeDto {
  @IsString()
  @IsNotEmpty({ message: 'O conteúdo XML da NF-e é obrigatório.' })
  xmlContent: string;
}
