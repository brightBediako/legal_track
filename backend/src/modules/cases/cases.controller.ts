import { Body, Controller, Get, Post } from '@nestjs/common';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  async list() {
    return this.casesService.list();
  }

  @Post()
  async create(@Body() body: CreateCaseDto) {
    return this.casesService.create(body);
  }
}

