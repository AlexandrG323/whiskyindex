import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors()
  app.setGlobalPrefix('api')

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Whisky Index API')
    .setDescription(
      'Сравнение продуктовой корзины и портфеля акций. Try endpoints directly from this UI.',
    )
    .setVersion('0.1.0')
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs-json',
  })

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`Whisky Index API is running on http://localhost:${port}/api`)
  console.log(`OpenAPI docs: http://localhost:${port}/api/docs`)
}

bootstrap()
