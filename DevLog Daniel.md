# Issue
- Current PWA settings are breaking localhost version in Chrome (freezing and just saying: 'Loading...'), but it seems to work fine in Microsoft Edge browser
- when experimenting in sandbox without PWA it seems to work fine in Chrome
- downside in Edge: seems to cache and not refresh page -> use private window to avoid cache

- Need to add declarations (components) and imports (modules) to TestBed in .spec.ts file to pass tests 

```
TestBed.configureTestingModule({
			declarations: [ RepoPageComponent, RepoTableComponent ],
			imports: [ GridModule, TableModule ]
		})
```
    