const fs = require('fs');
const fixImport = (file, imp) => {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(imp.substring(0, 30))) {
    fs.writeFileSync(file, imp + '\n' + content);
  }
};
fixImport('src/core/use-cases/address/disable-address.use-case.ts', "import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';");
fixImport('src/core/use-cases/address/register-address.use-case.ts', "import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';");
fixImport('src/core/use-cases/address/suggest-putaway.use-case.ts', "import { IAddressRepository } from '../../interfaces/repositories/i-address.repository';");
fixImport('src/core/use-cases/cost/get-product-cost-history.use-case.ts', "import { ILogCustoRepository, LogCusto } from '../../interfaces/repositories/i-log-custo.repository';");
fixImport('src/core/use-cases/inventory/register-count.use-case.ts', "import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';\nimport { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';\nimport { IAddressRepository } from '../../interfaces/repositories/i-address.repository';\nimport { RequestAdjustmentUseCase } from '../adjustment/request-adjustment.use-case';");
fixImport('src/core/use-cases/inventory/start-count.use-case.ts', "import { IInventoryCountRepository } from '../../interfaces/repositories/i-inventory-count.repository';\nimport { IBatchRepository } from '../../interfaces/repositories/i-batch.repository';\nimport { IAddressRepository } from '../../interfaces/repositories/i-address.repository';\nimport { IMovementRepository } from '../../interfaces/repositories/i-movement.repository';");
fixImport('src/core/use-cases/order/close-order.use-case.ts', "import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';");
fixImport('src/core/use-cases/order/create-order.use-case.ts', "import { IOrderRepository, PedidoExpedicaoWithItems } from '../../interfaces/repositories/i-order.repository';\nimport { IProductRepository } from '../../interfaces/repositories/i-product.repository';");
fixImport('src/core/use-cases/order/verify-order.use-case.ts', "import { IOrderRepository } from '../../interfaces/repositories/i-order.repository';");
fixImport('src/core/use-cases/product/disable-product.use-case.ts', "import { IProductRepository } from '../../interfaces/repositories/i-product.repository';");
fixImport('src/core/use-cases/product/register-product.use-case.ts', "import { IProductRepository } from '../../interfaces/repositories/i-product.repository';");
