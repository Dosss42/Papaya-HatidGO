import { shortName, spotName, toPlace } from './geocoding.service';

describe('geocoding helpers (place search on Book)', () => {
  it('keeps the two most specific parts, without postal codes or the country', () => {
    expect(shortName('Rizal Street, Poblacion, General Tinio, Nueva Ecija, Philippines')).toBe('Rizal Street, Poblacion');
    expect(shortName('General Tinio-Fort Magsaysay Road, 3104 General Tinio, Philippines')).toBe('General Tinio-Fort Magsaysay Road, General Tinio');
    expect(shortName('3104, Philippines')).toBe(''); // nothing a driver can use
    expect(shortName('Poblacion, Poblacion, General Tinio')).toBe('Poblacion, General Tinio');
  });

  it('names the pin "street, barangay" when both are known (real answers from the map)', () => {
    expect(
      spotName([
        { text: 'General Tinio-Fort Magsaysay Road', place_name: 'General Tinio-Fort Magsaysay Road, 3104 General Tinio, Philippines', place_type: ['address'] },
        { text: 'Concepcion', place_name: 'Concepcion, General Tinio, Philippines', place_type: ['place'] },
      ]),
    ).toBe('General Tinio-Fort Magsaysay Road, Concepcion');
    expect(spotName([{ text: 'San Pedro', place_name: 'San Pedro, General Tinio, Philippines', place_type: ['place'] }])).toBe('San Pedro, General Tinio');
    expect(spotName([])).toBeNull();
    expect(spotName([{ text: '3104', place_name: '3104, Philippines', place_type: ['place'] }])).toBeNull();
  });

  it('turns a search feature into a result: its name, where it is, and the point', () => {
    expect(
      toPlace({ text: 'Rizal Street', place_name: 'Rizal Street, 3103 Peñaranda, Philippines', center: [121.0, 15.36] }),
    ).toEqual({ name: 'Rizal Street', detail: 'Peñaranda', lat: 15.36, lng: 121.0 });
    expect(toPlace({ text: 'Nowhere', place_name: 'Nowhere' })).toBeNull();
    expect(toPlace({ center: [121, 15] })).toBeNull();
  });
});
