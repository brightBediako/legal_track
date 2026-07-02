import { Body, Controller, Get, Post } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async list() {
    return this.clientsService.list();
  }

  @Post()
  async create(@Body() body: CreateClientDto) {
    return this.clientsService.create(body);
  }
}

