import React, { useEffect, useState } from 'react';
import { apiClient, errorMessage } from '../../api/client';
import './Offers.css';

const initialForm = {
  name: '', code: '', description: '', offer_type: 'BUY_X_GET_Y',
  status: 'draft', buy_quantity: 1, get_quantity: 1,
  discount_percentage: 0, discount_amount: 0, products: [], branches: [],
};
const types = [
  ['BUY_X_GET_Y', 'Buy X Get Y'],
  ['PERCENTAGE_DISCOUNT', 'Percentage discount'],
  ['FIXED_DISCOUNT', 'Fixed amount discount'],
];
const pretty = (value) => value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function Offers() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ ...initialForm });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState([]);

  const update = (field, value) => setForm(previous => ({ ...previous, [field]: value }));
  const reset = () => { setEditing(null); setForm({ ...initialForm }); setError(''); };
  const refresh = async () => {
    try {
      const response = (await apiClient.get('/offers/')).data;
      setRows(Array.isArray(response) ? response : Array.isArray(response?.results) ? response.results : []);
      setError('');
    } catch (e) {
      setRows([]);
      setError(errorMessage(e));
    }
  };
  useEffect(() => {
    refresh();
    apiClient.get('/products/')
      .then(({ data }) => setProducts(Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []))
      .catch(() => {});
  }, []);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) await apiClient.patch(`/offers/${editing}/`, form);
      else await apiClient.post('/offers/', form);
      reset();
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, type = 'text', options = {}) => (
    <label className="offer-field" key={name}>
      <span className="offer-label">{label}</span>
      <input
        className="offer-control"
        type={type}
        required={options.required ?? false}
        min={options.min}
        step={options.step}
        value={form[name]}
        onChange={event => update(name, type === 'number' ? Number(event.target.value) : event.target.value)}
        placeholder={options.placeholder || ''}
      />
    </label>
  );

  return (
    <main className="offers-page">
      <header className="offers-header">
        <div>
          <h1>Offers &amp; Promotions</h1>
          <p>Configure server-validated promotions for your selected products.</p>
        </div>
      </header>

      {error && <div className="offers-alert" role="alert">{error}</div>}

      <section className="offers-panel">
        <div className="offers-panel-heading">
          <div>
            <h2>{editing ? 'Edit offer' : 'Create offer'}</h2>
            <p>Set up the offer details and choose which products qualify.</p>
          </div>
        </div>
        <form onSubmit={save}>
          <div className="offers-form-grid">
            {field('name', 'Offer name', 'text', { required: true, placeholder: 'e.g. Weekend BOGO' })}
            {field('code', 'Offer code', 'text', { required: true, placeholder: 'e.g. WEEKEND-BOGO' })}
            <label className="offer-field">
              <span className="offer-label">Offer type</span>
              <select className="offer-control" value={form.offer_type} onChange={event => update('offer_type', event.target.value)}>
                {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="offer-field offers-span-full">
              <span className="offer-label">Description</span>
              <textarea className="offer-control offer-description" rows={2} value={form.description} onChange={event => update('description', event.target.value)} placeholder="Optional details about this promotion" />
            </label>
            <label className="offer-field">
              <span className="offer-label">Status</span>
              <select className="offer-control" value={form.status} onChange={event => update('status', event.target.value)}>
                {['draft', 'active', 'paused', 'archived'].map(value => <option key={value} value={value}>{pretty(value)}</option>)}
              </select>
            </label>
            {form.offer_type === 'BUY_X_GET_Y' ? (
              <>
                {field('buy_quantity', 'Buy quantity', 'number', { min: 1, step: 1, required: true })}
                {field('get_quantity', 'Free quantity', 'number', { min: 1, step: 1, required: true })}
              </>
            ) : form.offer_type === 'PERCENTAGE_DISCOUNT' ? (
              field('discount_percentage', 'Discount (%)', 'number', { min: 0, step: 0.01, required: true })
            ) : (
              field('discount_amount', 'Discount amount', 'number', { min: 0, step: 0.01, required: true })
            )}
          </div>

          <div className="offers-product-section">
            <div className="offers-product-heading">
              <div>
                <h3>Eligible products</h3>
                <p>Choose the products to which this promotion applies.</p>
              </div>
              <span className="offers-selection-count">{form.products.length} selected</span>
            </div>
            <select
              className="offer-control offers-product-select"
              multiple
              aria-label="Eligible products"
              value={form.products}
              onChange={event => update('products', Array.from(event.target.selectedOptions, option => option.value))}
            >
              {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <p className="offers-help">Hold Ctrl (Windows) or Command (Mac) to select multiple products.</p>
          </div>

          <div className="offers-actions">
            {editing && <button type="button" className="offers-button offers-button-secondary" onClick={reset}>Cancel</button>}
            <button type="submit" className="offers-button offers-button-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Update offer' : 'Save offer'}</button>
          </div>
        </form>
      </section>

      {rows.length > 0 && (
        <section className="offers-existing" aria-label="Existing offers">
          <h2>Existing offers</h2>
          <div className="offers-list">
            {rows.map(offer => (
              <article className="offers-list-item" key={offer.id}>
                <div>
                  <strong>{offer.name}</strong>
                  <p>{offer.code} · {pretty(offer.offer_type)} · {pretty(offer.status)}</p>
                  {offer.description && <p>{offer.description}</p>}
                </div>
                <button className="offers-button offers-button-secondary" type="button" onClick={() => {
                  setEditing(offer.id);
                  setForm({ ...initialForm, ...offer, products: offer.products || [], branches: offer.branches || [] });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}>Edit</button>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
