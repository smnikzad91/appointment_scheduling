import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { normalizeIranianMobile } from './iran-mobile.js';
import { CreateSalonAppointmentDto } from '../appointments/dto/create-appointment.dto.js';

describe('Iranian mobile numbers', () => {
  it.each([
    ['09121234567', '09121234567'],
    ['+989121234567', '09121234567'],
    ['00989121234567', '09121234567'],
    ['989121234567', '09121234567'],
    ['+98 912 123 4567', '09121234567'],
    ['۰۹۱۲۱۲۳۴۵۶۷', '09121234567'],
    ['+۹۸۹۱۲۱۲۳۴۵۶۷', '09121234567'],
  ])('%s → %s', (input, out) => expect(normalizeIranianMobile(input)).toBe(out));

  it('leaves anything else for validation to reject', () => {
    expect(normalizeIranianMobile('+982112345678')).toBe('+982112345678');
    expect(normalizeIranianMobile('0912123')).toBe('0912123');
  });

  it('a staff booking with «+989…» passes validation as «09…»', async () => {
    const dto = plainToInstance(CreateSalonAppointmentDto, { customerPhone: '+989121234567', serviceIds: ['s1'], startAt: new Date().toISOString() });
    expect(dto.customerPhone).toBe('09121234567');
    expect((await validate(dto)).filter((e) => e.property === 'customerPhone')).toEqual([]);
  });
});
