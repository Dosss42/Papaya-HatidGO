import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ApiError } from '../../shared/utilities/api-error';
import { DriverDocumentsService } from './driver-documents.service';
import { VehicleService } from './vehicle.service';

const api = environment.apiUrl;

describe('Driver services (Phase 7)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uploads files[] and sides[] in the same order as multipart form data, then reloads the checklist', async () => {
    const docs = TestBed.inject(DriverDocumentsService);
    const front = new Blob(['front'], { type: 'image/jpeg' });
    const back = new Blob(['back'], { type: 'image/jpeg' });

    const done = docs.upload(
      1,
      [
        { blob: front, filename: 'front.jpg', side: 'front' },
        { blob: back, filename: 'back.jpg', side: 'back' },
      ],
      { expires_at: '2027-05-01', document_number: '', issued_at: null },
    );

    const post = http.expectOne(`${api}/drivers/me/documents`);
    expect(post.request.method).toBe('POST');
    const form = post.request.body as FormData;
    expect(form.get('requirement_id')).toBe('1');
    expect(form.getAll('sides[]')).toEqual(['front', 'back']);
    expect((form.getAll('files[]') as File[]).map((f) => f.name)).toEqual(['front.jpg', 'back.jpg']);
    expect(form.get('expires_at')).toBe('2027-05-01');
    expect(form.has('document_number')).toBe(false); // empty values are not sent
    expect(form.has('issued_at')).toBe(false);
    post.flush({ data: { id: 9, status: 'pending', is_current: true, files: [], reviews: [] } });

    await new Promise((resolve) => setTimeout(resolve)); // let the service finish and send the checklist reload
    http.expectOne(`${api}/drivers/me/requirements`).flush({ compliance_status: 'under_review', requirements: [] });

    expect((await done).id).toBe(9);
    expect(docs.checklist()?.compliance_status).toBe('under_review');
  });

  it('turns an API refusal into the app error shape', async () => {
    const docs = TestBed.inject(DriverDocumentsService);
    const done = docs.upload(3, [{ blob: new Blob(['x']), filename: 'orcr.jpg', side: 'page' }]);

    http.expectOne(`${api}/drivers/me/documents`).flush(
      { message: 'Idagdag muna ang tricycle mo.', code: 'TRICYCLE_REQUIRED', errors: {} },
      { status: 422, statusText: 'Unprocessable Content' },
    );

    await expect(done).rejects.toMatchObject({ status: 422, code: 'TRICYCLE_REQUIRED' } satisfies Partial<ApiError>);
  });

  it('keeps the active tricycle after creating and editing it', async () => {
    const vehicles = TestBed.inject(VehicleService);
    const tricycle = { id: 5, plate_number: 'ABC1234', body_number: null, make: null, model: null, color: 'Pula', status: 'pending', is_active: true };

    const created = vehicles.create({ plate_number: 'abc 1234', color: 'Pula' });
    const post = http.expectOne(`${api}/vehicles`);
    expect(post.request.body).toEqual({ plate_number: 'abc 1234', color: 'Pula' });
    post.flush({ data: tricycle });
    await created;
    expect(vehicles.active()?.plate_number).toBe('ABC1234');

    const edited = vehicles.update(5, { color: 'Asul' });
    const patch = http.expectOne(`${api}/vehicles/5`);
    expect(patch.request.method).toBe('PATCH');
    patch.flush({ data: { ...tricycle, color: 'Asul' } });
    await edited;
    expect(vehicles.active()?.color).toBe('Asul');

    vehicles.clear();
    expect(vehicles.active()).toBeNull();
  });
});
