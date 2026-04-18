import { ResponseInterceptor } from './response.interceptor';
import { of } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('should wrap response in { status_code, data }', (done) => {
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as any;
    const handler = { handle: () => of({ id: 1 }) } as any;

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({ status_code: 200, data: { id: 1 } });
      done();
    });
  });

  it('should handle null data', (done) => {
    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 204 }),
      }),
    } as any;
    const handler = { handle: () => of(null) } as any;

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({ status_code: 204, data: null });
      done();
    });
  });
});
