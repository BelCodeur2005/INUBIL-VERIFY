import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: ConfigService, useValue: { get: () => 'test' } },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  describe('GET /health', () => {
    it('retourne le statut ok', () => {
      expect(appController.getHealth().status).toBe('ok');
    });
  });

  describe('GET /', () => {
    it("retourne le nom de l'API", () => {
      expect(appController.getInfo().name).toBe('INUBIL Verify API');
    });
  });
});
