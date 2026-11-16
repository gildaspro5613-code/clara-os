export interface WeatherResult {
  success: boolean;
  code?:string;
  location: string;
  country?: string;
  temperatureC?: number;
  condition?: string;
  icon?: string;
  updatedAt?: Date;
  message?: string;
  completedAt: Date;
}
