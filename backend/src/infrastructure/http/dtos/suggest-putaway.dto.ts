import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class SuggestPutawayDto {
  @IsInt()
  @IsNotEmpty()
  produtoId: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantidade: number;
}
