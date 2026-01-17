import { MOCK_ALERTS } from '../data/mockData.js';

/**
 * Weather service interface
 */
export interface WeatherService {
	getWeatherAlerts(state: string): string;
	getForecast(city: string, days: number): string;
}

/**
 * Implementation of the weather service using mock data
 * In production, this would call a real weather API
 */
export class WeatherServiceImpl implements WeatherService {
	getWeatherAlerts(state: string): string {
		const stateUpper = state.toUpperCase();
		const alert = MOCK_ALERTS[stateUpper];

		if (alert) {
			return alert;
		}
		return `No active weather alerts for ${stateUpper}`;
	}

	getForecast(city: string, days: number): string {
		// Mock forecast data
		let forecast = `${days}-day forecast for ${city}:\n\n`;

		for (let i = 1; i <= days; i++) {
			const conditions = ['Sunny', 'Partly cloudy', 'Cloudy', 'Rainy', 'Stormy'];
			const condition = conditions[Math.floor(Math.random() * conditions.length)];
			const high = Math.floor(Math.random() * 20) + 65;
			const low = high - Math.floor(Math.random() * 15) - 5;

			forecast += `Day ${i}: ${condition}, High ${high}°F, Low ${low}°F\n`;
		}

		return forecast;
	}
}
