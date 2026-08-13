import { Module } from '@nestjs/common';
import { ContentItemsService } from './content-items.service';
import { ContentItemsController } from './content-items.controller';
import { PublicContentService } from './public-content.service';
import { PublicContentController } from './public-content.controller';
import { MediaController } from './media.controller';
import { NotificationTemplatesController } from './notification-templates.controller';

@Module({
  controllers: [
    ContentItemsController,
    PublicContentController,
    MediaController,
    NotificationTemplatesController,
  ],
  providers: [ContentItemsService, PublicContentService],
})
export class CmsModule {}
