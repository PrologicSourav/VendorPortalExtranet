import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, BehaviorSubject } from "rxjs";
import { environment } from "../../environments/environment";

const API = environment.apiUrl;

@Injectable({ providedIn: "root" })
export class ApiService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Auth
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${API}/auth/login`, {
      email,
      password,
      rememberMe: false,
    });
  }

  verifyOtp(otp: string): Observable<any> {
    return this.http.post(`${API}/auth/verify-otp`, { otp });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${API}/auth/forgot-password`, { email });
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<any> {
    return this.http.post(`${API}/auth/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  register(data: {
    email: string;
    password: string;
    companyName: string;
    displayName?: string;
    gstin?: string;
  }): Observable<any> {
    return this.http.post(`${API}/auth/register`, data);
  }

  // Vendors
  getVendors(status?: string, search?: string): Observable<any> {
    let params: any = {};
    if (status) params.status = status;
    if (search) params.search = search;
    return this.http.get(`${API}/vendors`, { params });
  }

  getVendor(id: string): Observable<any> {
    return this.http.get(`${API}/vendors/${id}`);
  }

  updateVendor(id: string, vendor: any): Observable<any> {
    return this.http.put(`${API}/vendors/${id}`, vendor);
  }

  // Purchase Orders
  getPurchaseOrders(
    vendorId: string,
    status?: string,
    page = 1,
    propertyId?: string | null,
  ): Observable<any> {
    let params: any = { page, pageSize: 20 };
    if (status) params.status = status;
    if (propertyId) params.propertyId = propertyId;
    return this.http.get(`${API}/purchaseorders/vendor/${vendorId}`, {
      params,
    });
  }

  getVendorProperties(vendorId: string): Observable<any> {
    return this.http.get(`${API}/purchaseorders/vendor/${vendorId}/properties`);
  }

  getPoDocument(id: string): Observable<Blob> {
    return this.http.get(`${API}/purchaseorders/${id}/document`, { responseType: "blob" });
  }

  getPurchaseOrder(id: string): Observable<any> {
    return this.http.get(`${API}/purchaseorders/${id}`);
  }

  acknowledgePo(id: string): Observable<any> {
    return this.http.put(`${API}/purchaseorders/${id}/acknowledge`, {});
  }

  partialAcceptPo(id: string, lines: any[]): Observable<any> {
    return this.http.put(`${API}/purchaseorders/${id}/partial-accept`, {
      lines,
    });
  }

  unableToSupplyPo(id: string, reason: string): Observable<any> {
    return this.http.put(`${API}/purchaseorders/${id}/unable-to-supply`, {
      reason,
    });
  }

  // Catalogues
  getCatalogues(vendorId: string, status?: string): Observable<any> {
    let params: any = {};
    if (status) params.status = status;
    return this.http.get(`${API}/catalogues/vendor/${vendorId}`, { params });
  }

  getCatalogue(id: string): Observable<any> {
    return this.http.get(`${API}/catalogues/${id}`);
  }

  createCatalogue(vendorId: string): Observable<any> {
    // buyingEntityId omitted (Guid.Empty server-side) — the API defaults it to the
    // first active buying entity since no entity-picker UI exists in the portal yet.
    return this.http.post(`${API}/catalogues`, { vendorId });
  }

  addCatalogueLines(catalogueId: string, lines: any[]): Observable<any> {
    return this.http.post(`${API}/catalogues/${catalogueId}/lines`, { lines });
  }

  // Master items (Web Prol'IFIC item list) — used to map catalogue lines.
  searchItems(search: string, category?: string): Observable<any> {
    let params: any = { page: 1, pageSize: 20 };
    if (search) params.search = search;
    if (category) params.category = category;
    return this.http.get(`${API}/items`, { params });
  }

  deleteCatalogueLine(catalogueId: string, lineId: string): Observable<any> {
    return this.http.delete(`${API}/catalogues/${catalogueId}/lines/${lineId}`);
  }

  submitCatalogue(id: string): Observable<any> {
    return this.http.put(`${API}/catalogues/${id}/submit`, {});
  }

  // Delivery Notes
  getDeliveryNotes(poId: string): Observable<any> {
    return this.http.get(`${API}/deliverynotes/po/${poId}`);
  }

  createDeliveryNote(dn: any): Observable<any> {
    return this.http.post(`${API}/deliverynotes`, dn);
  }

  submitDeliveryNote(id: string): Observable<any> {
    return this.http.put(`${API}/deliverynotes/${id}/submit`, {});
  }

  // Invoices
  getInvoices(vendorId: string, status?: string, page = 1): Observable<any> {
    let params: any = { page, pageSize: 20 };
    if (status) params.status = status;
    return this.http.get(`${API}/invoices/vendor/${vendorId}`, { params });
  }

  createInvoice(invoice: any): Observable<any> {
    return this.http.post(`${API}/invoices`, invoice);
  }

  getInvoice(id: string): Observable<any> {
    return this.http.get(`${API}/invoices/${id}`);
  }

  // Payments
  getPayments(vendorId: string, status?: string): Observable<any> {
    const params: any = {};
    if (status) params.status = status;
    return this.http.get(`${API}/payments/vendor/${vendorId}`, { params });
  }

  // Team (a vendor's own users + per-user chain/property access)
  getVendorUsers(vendorId: string): Observable<any> {
    return this.http.get(`${API}/vendorusers/vendor/${vendorId}`);
  }

  inviteVendorUser(vendorId: string, body: { email: string; displayName: string; role: string; password: string }): Observable<any> {
    return this.http.post(`${API}/vendorusers/vendor/${vendorId}`, body);
  }

  setVendorUserStatus(userId: string, isActive: boolean): Observable<any> {
    return this.http.put(`${API}/vendorusers/${userId}/status`, { isActive });
  }

  setVendorUserRole(userId: string, role: string): Observable<any> {
    return this.http.put(`${API}/vendorusers/${userId}/role`, { role });
  }

  getVendorUserAccess(userId: string): Observable<any> {
    return this.http.get(`${API}/vendorusers/${userId}/access`);
  }

  setVendorUserAccess(userId: string, relationshipIds: string[]): Observable<any> {
    return this.http.put(`${API}/vendorusers/${userId}/access`, relationshipIds);
  }

  // Chain/Property access (Flow C — request access to another chain/property)
  getBuyingEntities(): Observable<any> {
    return this.http.get(`${API}/buyingentities`);
  }

  getVendorRelationships(vendorId: string): Observable<any> {
    return this.http.get(`${API}/vendorrelationships/vendor/${vendorId}`);
  }

  getVendorRequests(vendorId: string): Observable<any> {
    return this.http.get(`${API}/vendorrequests/vendor/${vendorId}`);
  }

  requestVendorAccess(body: {
    vendorId: string;
    requestedBuyingEntityId: string;
    requestedPropertyId?: string | null;
    requestType: "Chain" | "Property";
    remarks?: string;
  }): Observable<any> {
    return this.http.post(`${API}/vendorrequests`, body);
  }

  // Notifications
  getNotifications(userId: string): Observable<any> {
    return this.http.get(`${API}/notifications/user/${userId}`);
  }

  markAllNotificationsRead(userId: string): Observable<any> {
    return this.http.put(
      `${API}/notifications/user/${userId}/mark-all-read`,
      {},
    );
  }

  markNotificationRead(notificationId: string): Observable<any> {
    return this.http.put(
      `${API}/notifications/${notificationId}/mark-read`,
      {},
    );
  }

  setUser(user: any) {
    this.currentUserSubject.next(user);
  }
}
