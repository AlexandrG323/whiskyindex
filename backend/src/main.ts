import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors()
  app.setGlobalPrefix('api')
  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`Whisky Index API is running on http://localhost:${port}/api`)
}

bootstrap()
