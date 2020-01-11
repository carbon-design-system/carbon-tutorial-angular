import { CarbonAngularStarterPage } from './app.po';

describe('carbon-angular-starter App', () => {
	let page: CarbonAngularStarterPage;

	beforeEach(() => {
		page = new CarbonAngularStarterPage();
	});

	it('should display message saying app works', () => {
		page.navigateTo();

		let paragraphText = '';
		page.getParagraphText().then(v => paragraphText = v);

		expect(paragraphText).toEqual('app works!');
	});
});
