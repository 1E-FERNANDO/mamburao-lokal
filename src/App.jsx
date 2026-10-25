import { useEffect, useMemo, useState } from 'react'
import { businesses as sampleBusinesses, categories as sampleCategories, products as sampleProducts } from './data/businesses.js'
import { supabase } from './lib/supabase.js'
import './styles.css'

const categoryIcons = {
  food: '🍲',
  grocery: '🛒',
  fashion: '🧵',
  pasalubong: '🎁',
  accommodation: '🛏️',
  tourism: '🧭',
  beauty: '🌿',
  electronics: '📱',
  home: '🏠',
  services: '🧰',
  all: '✳',
}

function formatPrice(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
}

function ListingCard({ item, type, onSelect }) {
  const isProduct = type === 'product'
  const listingArt = item.imageUrl
    ? <img src={item.imageUrl} alt={`Photo of ${item.name}`} />
    : isProduct && !item.isSample
      ? <span className="image-missing">Seller photo unavailable</span>
      : <span className="listing-art" aria-hidden="true">{item.art || (isProduct ? '🧺' : '🏪')}</span>
  return (
    <article className="listing-card">
      <button className={`listing-image image-${item.tone || 'green'}`} onClick={() => onSelect(item)} aria-label={`View ${isProduct ? 'product' : 'business'} details for ${item.name}`}>
        {listingArt}
        {item.isSample && <span className="sample-badge">Sample listing</span>}
        {isProduct && <span className={`availability ${item.available ? 'available' : 'unavailable'}`}>{item.available ? 'Available' : 'Unavailable'}</span>}
      </button>
      <div className="listing-body">
        <p className="listing-category">{item.categoryLabel}</p>
        <h3>{item.name}</h3>
        {isProduct && <p className="listing-price">{formatPrice(item.price)}</p>}
        <p className="listing-description">{item.description}</p>
        <p className="listing-seller">{isProduct ? `By ${item.businessName}` : item.location}</p>
        <div className="listing-actions">
          <button className="button button-outline" onClick={() => onSelect(item)}>View details</button>
          {isProduct && <ContactButton item={item} compact />}
        </div>
      </div>
    </article>
  )
}

function ContactButton({ item, compact = false }) {
  const phone = item.phone || item.businessPhone
  const email = item.email || item.businessEmail
  const className = `button button-green${compact ? ' button-small' : ''}`

  if (phone) return <a className={className} href={`tel:${phone}`}>Contact seller</a>
  if (email) return <a className={className} href={`mailto:${email}`}>Contact seller</a>
  return <button className={className} disabled title="Seller contact details have not been provided">Contact seller</button>
}

function DetailDialog({ item, type, onClose }) {
  if (!item) return null
  const isProduct = type === 'product'
  const detailArt = item.imageUrl
    ? <img src={item.imageUrl} alt={`Photo of ${item.name}`} />
    : isProduct && !item.isSample
      ? <span className="image-missing">Seller photo unavailable</span>
      : <span aria-hidden="true">{item.art || (isProduct ? '🧺' : '🏪')}</span>
  const directions = item.location && !item.isSample
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name}, ${item.location}, Mamburao, Occidental Mindoro`)}`
    : null

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="modal-close" onClick={onClose} aria-label="Close details">×</button>
        <div className={`detail-image image-${item.tone || 'green'}`}>{detailArt}</div>
        <div className="detail-content">
          {item.isSample && <span className="sample-badge inline-badge">Illustrative sample — not a real listing</span>}
          <p className="listing-category">{item.categoryLabel}</p>
          <h2 id="detail-title">{item.name}</h2>
          {isProduct && <p className="detail-price">{formatPrice(item.price)} <span>· {item.available ? 'Available' : 'Unavailable'}</span></p>}
          <p>{item.description}</p>
          {isProduct && <p><strong>Seller:</strong> {item.businessName}</p>}
          {item.location && <p><strong>Location:</strong> {item.location}</p>}
          {item.hours && <p><strong>Hours:</strong> {item.hours}</p>}
          <div className="detail-buttons">
            <ContactButton item={item} />
            {directions && <a className="button button-outline" href={directions} target="_blank" rel="noreferrer">Directions</a>}
          </div>
          {item.isSample && <p className="detail-disclaimer">Details and contact information must be confirmed by the business owner before publication.</p>}
        </div>
      </section>
    </div>
  )
}

function AuthDialog({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [accountType, setAccountType] = useState('buyer')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName.trim(), account_type: accountType } },
        })
        if (error) throw error
        if (data.session) {
          onAuthenticated(data.session)
          if (accountType === 'seller') setMessage('Account created. Submit a business application from your dashboard; admin approval is required before seller access.')
        }
        else {
          setMode('login')
          setPassword('')
          setMessage(accountType === 'seller'
            ? 'Account created. Confirm your email, then sign in below. Submit your business application from the dashboard; admin approval is required before seller access.'
            : 'Account created. Confirm your email if you have not yet, then sign in below with your email and password.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuthenticated(data.session)
      }
    } catch (error) {
      setMessage(error.message || 'Unable to complete sign-in. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" onClick={onClose} aria-label="Close sign in">×</button>
        <p className="eyebrow">MAMBURAO LOKAL ACCOUNT</p>
        <h2 id="auth-title">{supabase ? (mode === 'login' ? 'Welcome back' : 'Create your account') : 'Accounts are not connected yet'}</h2>
        {supabase ? (
          <form className="stack-form" onSubmit={submit}>
            {mode === 'signup' && <label>Full name<input required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>}
            {mode === 'signup' && <label>Account type<select value={accountType} onChange={(event) => setAccountType(event.target.value)}><option value="buyer">Buyer / visitor</option><option value="seller">Business owner (apply to become a seller)</option></select></label>}
            <label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input required minLength="8" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            {message && <p className="form-message" role="status">{message}</p>}
            <button className="button button-green" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}</button>
            <button type="button" className="text-button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>
              {mode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}
            </button>
            {mode === 'login' && <p className="auth-role-note">Your access role is assigned by the system. Admin access is granted separately and cannot be selected here.</p>}
          </form>
        ) : (
          <p className="setup-message">Add the Supabase URL and public anon key to your local <code>.env</code> file and apply the SQL migration to enable secure accounts. Demo browsing is available without an account.</p>
        )}
      </section>
    </div>
  )
}

function App() {
  const [businesses, setBusinesses] = useState(supabase ? [] : sampleBusinesses)
  const [products, setProducts] = useState(supabase ? [] : sampleProducts)
  const [categories, setCategories] = useState(supabase ? [] : sampleCategories)
  const [loadingListings, setLoadingListings] = useState(Boolean(supabase))
  const [loadError, setLoadError] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('featured')
  const [activeView, setActiveView] = useState('businesses')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [notice, setNotice] = useState('')
  const [sellerBusinesses, setSellerBusinesses] = useState([])
  const [sellerProducts, setSellerProducts] = useState([])
  const [sellerApplication, setSellerApplication] = useState(null)
  const [editingBusinessId, setEditingBusinessId] = useState('')
  const [businessImage, setBusinessImage] = useState(null)
  const [productImage, setProductImage] = useState(null)
  const [adminQueue, setAdminQueue] = useState({ applications: [], businesses: [], products: [], profiles: [], categories: [], approvedBusinesses: [], approvedProducts: [] })
  const [adminStats, setAdminStats] = useState({ businesses: 0, products: 0, sellers: 0 })
  const [newCategoryName, setNewCategoryName] = useState('')
  const [businessForm, setBusinessForm] = useState({ business_name: '', description: '', category_id: '', address: '', phone: '', contact_email: '', operating_hours: '' })
  const [productForm, setProductForm] = useState({ business_id: '', name: '', description: '', category_id: '', price: '', available: true })
  const [productImagePreview, setProductImagePreview] = useState('')

  async function loadDirectory() {
    if (!supabase) return
    setLoadingListings(true)
    setLoadError('')
    const [categoryResult, businessResult, productResult] = await Promise.all([
      supabase.from('categories').select('id, name, slug, icon').eq('is_active', true).order('name'),
      supabase.from('businesses').select('*, categories(name, slug)').eq('status', 'approved').order('name'),
      supabase.from('products').select('*, categories(name, slug), businesses!inner(name, phone, contact_email, location, status)').eq('status', 'approved').eq('businesses.status', 'approved').order('created_at', { ascending: false }),
    ])
    const error = categoryResult.error || businessResult.error || productResult.error
    if (error) {
      setLoadError(`Could not load approved listings: ${error.message}`)
      setLoadingListings(false)
      return
    }
    const categoryRows = categoryResult.data || []
    setCategories([{ id: 'all', label: 'All categories', icon: 'all' }, ...categoryRows.map((category) => ({ id: category.slug, label: category.name, icon: category.icon || category.slug, uuid: category.id }))])
    const approvedBusinesses = businessResult.data || []
    const approvedProducts = productResult.data || []
    const imagePaths = [...approvedBusinesses.map((item) => item.cover_image_path), ...approvedProducts.map((item) => item.image_path)].filter(Boolean)
    const imageUrls = new Map()
    const imageResults = await Promise.all(imagePaths.map(async (path) => {
      const { data, error: imageError } = await supabase.storage.from('business-media').createSignedUrl(path, 3600)
      if (imageError) {
        setNotice(`Could not load an approved listing image: ${imageError.message}`)
        return null
      }
      return [path, data.signedUrl]
    }))
    imageResults.filter(Boolean).forEach(([path, url]) => imageUrls.set(path, url))
    setBusinesses(approvedBusinesses.map((business) => ({
      ...business,
      name: business.name,
      category: business.categories?.slug || '',
      categoryLabel: business.categories?.name || 'Local business',
      location: business.location || business.address || 'Mamburao, Occidental Mindoro',
      hours: business.operating_hours || 'Contact business to confirm hours',
      email: business.contact_email,
      phone: business.phone,
      isSample: false,
      tone: 'green',
      art: '🏪',
      imageUrl: imageUrls.get(business.cover_image_path),
    })))
    setProducts(approvedProducts.map((product) => ({
      ...product,
      category: product.categories?.slug || '',
      categoryLabel: product.categories?.name || 'Local product',
      businessName: product.businesses?.name || 'Local business',
      businessPhone: product.businesses?.phone,
      businessEmail: product.businesses?.contact_email,
      isSample: false,
      tone: 'green',
      art: '🧺',
      imageUrl: imageUrls.get(product.image_path),
    })))
    setLoadingListings(false)
  }

  async function loadProfile(currentSession) {
    if (!supabase || !currentSession?.user) {
      setProfile(null)
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    const { data, error } = await supabase.from('profiles').select('id, full_name, role').eq('id', currentSession.user.id).single()
    if (error) {
      setNotice(`Could not load account profile: ${error.message}`)
      setProfile(null)
      setProfileLoading(false)
      return
    }
    setProfile(data)
    setProfileLoading(false)
  }

  async function loadSellerData(currentSession = session) {
    if (!supabase || !currentSession?.user || profile?.role !== 'seller') return
    const [businessResult, productResult] = await Promise.all([
      supabase.from('businesses').select('id, name, description, category_id, address, phone, contact_email, operating_hours, status').eq('owner_id', currentSession.user.id).order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, available, status, businesses!inner(owner_id)').eq('businesses.owner_id', currentSession.user.id).order('created_at', { ascending: false }),
    ])
    const error = businessResult.error || productResult.error
    if (error) {
      setNotice(`Could not load seller listings: ${error.message}`)
      return
    }
    setSellerBusinesses(businessResult.data || [])
    setSellerProducts(productResult.data || [])
  }

  async function loadSellerApplication(currentSession = session) {
    if (!supabase || !currentSession?.user || profile?.role !== 'buyer') return
    const { data, error } = await supabase.from('seller_applications').select('business_name, status, created_at').eq('owner_id', currentSession.user.id).eq('status', 'pending').maybeSingle()
    if (error) {
      setNotice(`Could not load seller application: ${error.message}`)
      return
    }
    setSellerApplication(data)
  }

  async function loadAdminQueue() {
    if (!supabase || profile?.role !== 'admin') return
    const [applications, pendingBusinesses, pendingProducts, profiles, adminCategories, approvedBusinesses, approvedProducts, businessCount, productCount, sellerCount] = await Promise.all([
      supabase.from('seller_applications').select('id, business_name, contact_email, phone, address, operating_hours, description, status, created_at').eq('status', 'pending').order('created_at'),
      supabase.from('businesses').select('id, name, status, address, description').eq('status', 'pending').order('created_at'),
      supabase.from('products').select('id, name, status, description, price, image_path, business_id, businesses(name)').eq('status', 'pending').order('created_at'),
      supabase.from('profiles').select('id, full_name, role, created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('categories').select('id, name, slug, is_active').order('name'),
      supabase.from('businesses').select('id, name, is_featured').eq('status', 'approved').order('name'),
      supabase.from('products').select('id, name, is_featured, businesses(name)').eq('status', 'approved').order('name'),
      supabase.from('businesses').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
    ])
    const error = applications.error || pendingBusinesses.error || pendingProducts.error || profiles.error || adminCategories.error || approvedBusinesses.error || approvedProducts.error || businessCount.error || productCount.error || sellerCount.error
    if (error) {
      setNotice(`Could not load moderation queue: ${error.message}`)
      return
    }
    const pendingProductsWithPhotos = await signListingImages(pendingProducts.data || [], 'image_path')
    setAdminQueue({ applications: applications.data || [], businesses: pendingBusinesses.data || [], products: pendingProductsWithPhotos, profiles: profiles.data || [], categories: adminCategories.data || [], approvedBusinesses: approvedBusinesses.data || [], approvedProducts: approvedProducts.data || [] })
    setAdminStats({ businesses: businessCount.count || 0, products: productCount.count || 0, sellers: sellerCount.count || 0 })
  }

  useEffect(() => {
    loadDirectory()
    if (!supabase) return undefined
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setNotice(`Could not check sign-in status: ${error.message}`)
      setSession(data?.session || null)
      setShowDashboard(Boolean(data?.session))
      loadProfile(data?.session || null)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setShowDashboard(Boolean(nextSession))
      window.setTimeout(() => loadProfile(nextSession), 0)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session && profile?.role === 'seller') loadSellerData(session)
    if (session && profile?.role === 'buyer') loadSellerApplication(session)
    if (session && profile?.role === 'admin') loadAdminQueue()
  }, [session, profile])

  useEffect(() => {
    if (!supabase) return undefined
    const channel = supabase.channel('mamburao-marketplace-live')
    for (const table of ['categories', 'businesses', 'products', 'seller_applications', 'profiles']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        loadDirectory()
        if (session && profile?.role === 'admin') loadAdminQueue()
        if (session && profile?.role === 'seller') loadSellerData(session)
        if (session && profile?.role === 'buyer') loadSellerApplication(session)
        if (session && table === 'profiles') loadProfile(session)
      })
    }
    channel.subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setNotice(`Live updates could not connect: ${error?.message || status}. Check that the Realtime migration has been applied.`)
      }
    })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, profile])

  useEffect(() => {
    if (session && profile && showDashboard) {
      document.getElementById('account-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [session, profile, showDashboard])

  const filteredBusinesses = useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    const results = businesses.filter((business) => {
      const categoryMatches = activeCategory === 'all' || business.category === activeCategory
      const searchMatches = !search || [business.name, business.description, business.categoryLabel, business.location].some((value) => (value || '').toLocaleLowerCase().includes(search))
      return categoryMatches && searchMatches
    })
    if (sortOrder === 'name') return [...results].sort((a, b) => a.name.localeCompare(b.name))
    return [...results].sort((a, b) => Number(b.featured) - Number(a.featured))
  }, [businesses, activeCategory, query, sortOrder])

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    const results = products.filter((product) => {
      const categoryMatches = activeCategory === 'all' || product.category === activeCategory
      const searchMatches = !search || [product.name, product.description, product.categoryLabel, product.businessName].some((value) => (value || '').toLocaleLowerCase().includes(search))
      return categoryMatches && searchMatches
    })
    if (sortOrder === 'price-low') return [...results].sort((a, b) => Number(a.price) - Number(b.price))
    if (sortOrder === 'price-high') return [...results].sort((a, b) => Number(b.price) - Number(a.price))
    if (sortOrder === 'name') return [...results].sort((a, b) => a.name.localeCompare(b.name))
    if (sortOrder === 'featured') return [...results].sort((a, b) => Number(b.featured) - Number(a.featured))
    return results
  }, [products, activeCategory, query, sortOrder])

  async function handleAuth(sessionValue) {
    setSession(sessionValue)
    setShowDashboard(true)
    setAuthOpen(false)
    await loadProfile(sessionValue)
    setNotice('You are signed in.')
  }

  async function submitSellerApplication(event) {
    event.preventDefault()
    if (!supabase || !session) return
    const category = categories.find((item) => item.uuid === businessForm.category_id)
    if (!category) {
      setNotice('Please select a business category.')
      return
    }
    const { error } = await supabase.from('seller_applications').insert({
      owner_id: session.user.id,
      category_id: category.uuid,
      business_name: businessForm.business_name.trim(),
      description: businessForm.description.trim(),
      address: businessForm.address.trim(),
      phone: businessForm.phone.trim() || null,
      contact_email: businessForm.contact_email.trim() || null,
      operating_hours: businessForm.operating_hours.trim() || null,
    })
    if (error) {
      setNotice(`Seller application failed: ${error.message}`)
      return
    }
    setNotice('Application submitted for administrator review.')
    setSellerApplication({ business_name: businessForm.business_name.trim(), status: 'pending' })
    setBusinessForm({ business_name: '', description: '', category_id: '', address: '', phone: '', contact_email: '', operating_hours: '' })
  }

  async function uploadListingImage(file, businessId, entityFolder) {
    if (!file) return null
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error('Choose a JPG, PNG, or WebP image under 5 MB.')
    }
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = entityFolder
      ? `${businessId}/${entityFolder}/${crypto.randomUUID()}.${extension}`
    : `${businessId}/business/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from('business-media').upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    return path
  }

  async function saveSellerBusiness(event) {
    event.preventDefault()
    if (!supabase || !session || profile?.role !== 'seller') return
    const category = categories.find((item) => item.uuid === businessForm.category_id)
    if (!category) {
      setNotice('Please select a business category.')
      return
    }
    const businessData = {
      owner_id: session.user.id,
      category_id: category.uuid,
      name: businessForm.business_name.trim(),
      description: businessForm.description.trim(),
      address: businessForm.address.trim(),
      phone: businessForm.phone.trim() || null,
      contact_email: businessForm.contact_email.trim() || null,
      operating_hours: businessForm.operating_hours.trim() || null,
      status: 'pending',
    }
    try {
      let businessId = editingBusinessId
      if (editingBusinessId) {
        const { error } = await supabase.from('businesses').update(businessData).eq('id', editingBusinessId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('businesses').insert(businessData).select('id').single()
        if (error) throw error
        businessId = data.id
      }
      const imagePath = await uploadListingImage(businessImage, businessId)
      if (imagePath) {
        const { error } = await supabase.from('businesses').update({ cover_image_path: imagePath, status: 'pending' }).eq('id', businessId)
        if (error) throw error
      }
      setNotice('Business profile submitted for administrator review.')
      setEditingBusinessId('')
      setBusinessImage(null)
      setBusinessForm({ business_name: '', description: '', category_id: '', address: '', phone: '', contact_email: '', operating_hours: '' })
      await Promise.all([loadSellerData(session), loadDirectory()])
    } catch (error) {
      setNotice(`Business profile could not be saved: ${error.message}`)
    }
  }

  async function submitProduct(event) {
    event.preventDefault()
    const selectedBusiness = sellerBusinesses.find((business) => business.id === productForm.business_id)
    const category = categories.find((item) => item.uuid === productForm.category_id)
    if (!supabase || !selectedBusiness || !category || !productImage) {
      setNotice('Choose an approved business, a category, and a real product photo before submitting.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(productImage.type) || productImage.size > 5 * 1024 * 1024) {
      setNotice('Choose a JPG, PNG, or WebP product photo under 5 MB.')
      return
    }
    const { data, error } = await supabase.from('products').insert({
      business_id: selectedBusiness.id,
      category_id: category.uuid,
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price),
      available: productForm.available,
      status: 'pending',
    }).select('id').single()
    if (error) {
      setNotice(`Product submission failed: ${error.message}`)
      return
    }
    try {
      const imagePath = await uploadListingImage(productImage, selectedBusiness.id, data.id)
      if (imagePath) {
        const { error: imageUpdateError } = await supabase.from('products').update({ image_path: imagePath }).eq('id', data.id)
        if (imageUpdateError) throw imageUpdateError
      }
    } catch (error) {
      setNotice(`Product saved, but its image could not be uploaded: ${error.message}`)
      return
    }
    setNotice('Product submitted for administrator review.')
    setProductForm({ business_id: '', name: '', description: '', category_id: '', price: '', available: true })
    setProductImage(null)
    setProductImagePreview('')
    loadSellerData(session)
  }

  function selectProductImage(file) {
    setProductImagePreview(file ? URL.createObjectURL(file) : '')
    setProductImage(file)
  }

  useEffect(() => () => {
    if (productImagePreview) URL.revokeObjectURL(productImagePreview)
  }, [productImagePreview])

  async function signListingImages(items, pathField) {
    return Promise.all(items.map(async (item) => {
      if (!item[pathField]) return { ...item, imageUrl: '' }
      const { data, error } = await supabase.storage.from('business-media').createSignedUrl(item[pathField], 3600)
      if (error) {
        setNotice(`Could not load a photo for ${item.name}: ${error.message}`)
        return { ...item, imageUrl: '' }
      }
      return { ...item, imageUrl: data.signedUrl }
    }))
  }

  async function moderate(table, id, status) {
    const { error } = await supabase.from(table).update({ status }).eq('id', id)
    if (error) {
      setNotice(`Moderation update failed: ${error.message}`)
      return
    }
    setNotice(`Listing ${status}.`)
    await Promise.all([loadAdminQueue(), loadDirectory()])
  }

  async function decideApplication(id, approved) {
    const { error } = await supabase.rpc('review_seller_application', { application_id: id, approve: approved })
    if (error) {
      setNotice(`Seller application update failed: ${error.message}`)
      return
    }
    setNotice(approved ? 'Seller account approved.' : 'Seller application declined.')
    loadAdminQueue()
  }

  async function changeAvailability(id, available) {
    const { error } = await supabase.from('products').update({ available, status: 'pending' }).eq('id', id)
    if (error) {
      setNotice(`Availability update failed: ${error.message}`)
      return
    }
    setNotice('Availability change submitted for review.')
    loadSellerData(session)
  }

  async function addCategory(event) {
    event.preventDefault()
    const name = newCategoryName.trim()
    const slug = name.toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    if (!name || !slug) {
      setNotice('Enter a category name using letters or numbers.')
      return
    }
    const { error } = await supabase.from('categories').insert({ name, slug, icon: slug })
    if (error) {
      setNotice(`Category could not be added: ${error.message}`)
      return
    }
    setNewCategoryName('')
    setNotice('Category added.')
    loadAdminQueue()
    loadDirectory()
  }

  async function toggleCategory(category) {
    const { error } = await supabase.from('categories').update({ is_active: !category.is_active }).eq('id', category.id)
    if (error) {
      setNotice(`Category could not be updated: ${error.message}`)
      return
    }
    setNotice(`Category ${category.is_active ? 'disabled' : 'enabled'}.`)
    loadAdminQueue()
    loadDirectory()
  }

  async function changeUserRole(userId, role) {
    const { error } = await supabase.rpc('set_marketplace_user_role', { target_user_id: userId, new_role: role })
    if (error) {
      setNotice(`User role could not be updated: ${error.message}`)
      return
    }
    setNotice('User role updated.')
    loadAdminQueue()
  }

  async function toggleFeatured(table, item) {
    const { error } = await supabase.from(table).update({ is_featured: !item.is_featured }).eq('id', item.id)
    if (error) {
      setNotice(`Featured listing could not be updated: ${error.message}`)
      return
    }
    setNotice(item.is_featured ? 'Listing removed from featured.' : 'Listing featured on the homepage.')
    await Promise.all([loadAdminQueue(), loadDirectory()])
  }

  const featuredBusinesses = businesses.filter((item) => item.featured)
  const featuredProducts = products.filter((item) => item.featured)

  function selectCategory(slug) {
    setActiveCategory(slug)
    setActiveView('businesses')
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#home" aria-label="Mamburao Lokal home"><span className="brand-mark">M</span><span>Mamburao <b>Lokal</b><small>LOCAL FINDS, CLOSE TO HOME</small></span></a>
          <button className="menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-expanded={mobileMenuOpen} aria-label="Toggle navigation"><span /><span /></button>
          <nav className={`main-nav ${mobileMenuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
            <a href="#home" onClick={() => { setMobileMenuOpen(false); setShowDashboard(false) }}>Home</a><a href="#explore" onClick={() => { setMobileMenuOpen(false); setShowDashboard(false) }}>Explore Businesses</a><a href="#categories" onClick={() => { setMobileMenuOpen(false); setShowDashboard(false) }}>Categories</a><a href="#about" onClick={() => { setMobileMenuOpen(false); setShowDashboard(false) }}>About</a>
            {session ? <><button className="nav-login" onClick={() => { setMobileMenuOpen(false); setShowDashboard(true); document.getElementById('account-section')?.scrollIntoView({ behavior: 'smooth' }) }}>Dashboard</button><span className="nav-user">{profile?.full_name || session.user.email}</span><button className="nav-login" onClick={async () => { setMobileMenuOpen(false); const { error } = await supabase.auth.signOut(); if (error) setNotice(`Sign out failed: ${error.message}`); else setNotice('Signed out.') }}>Sign out</button></> : <button className="nav-login" onClick={() => { setMobileMenuOpen(false); setAuthOpen(true) }}>Login / Register</button>}
          </nav>
        </div>
      </header>

      <main id="home" className={session && showDashboard ? 'dashboard-mode' : ''}>
        {!supabase && <div className="demo-banner"><strong>DEMO MODE</strong><span>Listings are illustrative samples, not real local businesses. Connect Supabase to enable accounts and live approved listings.</span></div>}
        {notice && <div className="notice-bar" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
        <section className="market-hero">
          <div className="hero-copy-column">
            <p className="eyebrow"><span className="eyebrow-dot" /> OCCIDENTAL MINDORO · PHILIPPINES</p>
            <h1>Discover local<br />businesses in <span>Mamburao.</span></h1>
            <p className="hero-description">Explore local shops, products, food, and services in one place. Your next favorite find is closer than you think.</p>
            <form className="market-search" onSubmit={(event) => { event.preventDefault(); document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' }) }}>
              <span aria-hidden="true">⌕</span><label className="sr-only" htmlFor="market-search">Search products, services, and businesses</label>
              <input id="market-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shops, products, food, and services…" />
              {query && <button className="clear-button" type="button" onClick={() => setQuery('')}>Clear</button>}
              <button className="button button-green" type="submit">Search</button>
            </form>
            <p className="hero-trust">A directory for curious visitors and proud locals.</p>
          </div>
          <div className="hero-scene" aria-label="Illustration of a welcoming coastal town">
            <div className="scene-sun" /><div className="scene-hill hill-one" /><div className="scene-hill hill-two" />
            <div className="scene-sea" /><div className="scene-village"><i /><i /><i /><i /></div>
            <div className="scene-note"><span>✳</span><div>Make room for<br /><b>a local discovery.</b></div></div>
          </div>
        </section>

        <section className="category-section" id="categories">
          <div className="section-heading"><div><p className="eyebrow">BROWSE YOUR WAY</p><h2>Find it by category</h2></div><a href="#explore">Explore all <span>→</span></a></div>
          <div className="category-grid">
            {categories.filter((category) => category.id !== 'all').map((category) => (
              <button className={`category-tile ${activeCategory === category.id ? 'category-selected' : ''}`} key={category.id} onClick={() => selectCategory(category.id)}>
                <span className="category-emoji" aria-hidden="true">{categoryIcons[category.icon] || categoryIcons[category.id] || '✳'}</span>
                <span>{category.label}</span><b aria-hidden="true">↗</b>
              </button>
            ))}
          </div>
        </section>

        {(featuredBusinesses.length > 0 || featuredProducts.length > 0) && (
          <section className="showcase-section" aria-label="Featured local listings">
            {featuredBusinesses.length > 0 && <div className="showcase-block"><div className="section-heading"><div><p className="eyebrow">GET TO KNOW THE COMMUNITY</p><h2>Featured local businesses</h2></div><button className="showcase-link" onClick={() => { setActiveView('businesses'); document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' }) }}>Browse businesses →</button></div><div className="listing-grid">{featuredBusinesses.slice(0, 4).map((item) => <ListingCard key={item.id} item={item} type="business" onSelect={(business) => setSelectedItem({ ...business, type: 'business' })} />)}</div></div>}
            {featuredProducts.length > 0 && <div className="showcase-block"><div className="section-heading"><div><p className="eyebrow">MADE OR SHARED LOCALLY</p><h2>Popular product picks</h2></div><button className="showcase-link" onClick={() => { setActiveView('products'); document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' }) }}>Browse products →</button></div><div className="listing-grid">{featuredProducts.slice(0, 4).map((item) => <ListingCard key={item.id} item={item} type="product" onSelect={(product) => setSelectedItem({ ...product, type: 'product' })} />)}</div></div>}
          </section>
        )}

        <section className="explore-section" id="explore">
          <div className="section-heading explore-heading">
            <div><p className="eyebrow">THE LOCAL DIRECTORY</p><h2>Explore Mamburao Lokal</h2><p className="section-subtitle">Find a business, a useful service, or something good to bring home.</p></div>
            <label className="sort-control">Sort by
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                <option value="featured">Recommended</option><option value="name">Name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>
          <div className="market-tabs" role="tablist" aria-label="Listing type">
            <button role="tab" aria-selected={activeView === 'businesses'} className={activeView === 'businesses' ? 'tab-active' : ''} onClick={() => setActiveView('businesses')}>Businesses <span>{businesses.length}</span></button>
            <button role="tab" aria-selected={activeView === 'products'} className={activeView === 'products' ? 'tab-active' : ''} onClick={() => setActiveView('products')}>Products <span>{products.length}</span></button>
          </div>
          <div className="filter-row" aria-label="Filter by category">
            {categories.map((category) => <button key={category.id} className={`filter-chip ${activeCategory === category.id ? 'filter-active' : ''}`} onClick={() => setActiveCategory(category.id)}>{category.id !== 'all' && <span aria-hidden="true">{categoryIcons[category.icon] || categoryIcons[category.id] || '✳'}</span>}{category.label}</button>)}
          </div>
          {loadError && <div className="error-panel" role="alert">{loadError}</div>}
          {loadingListings ? <div className="empty-panel">Loading approved local listings…</div> : (
            <>
              {activeView === 'businesses' ? (
                filteredBusinesses.length ? <div className="listing-grid">{filteredBusinesses.map((item) => <ListingCard key={item.id} item={item} type="business" onSelect={(business) => setSelectedItem({ ...business, type: 'business' })} />)}</div>
                  : <div className="empty-panel"><span>🔎</span><h3>No businesses found</h3><p>Try another search or select a different category.</p><button className="button button-outline" onClick={() => { setQuery(''); setActiveCategory('all') }}>Clear filters</button></div>
              ) : filteredProducts.length ? <div className="listing-grid">{filteredProducts.map((item) => <ListingCard key={item.id} item={item} type="product" onSelect={(product) => setSelectedItem({ ...product, type: 'product' })} />)}</div>
                : <div className="empty-panel"><span>🧺</span><h3>No products found</h3><p>Try another search or category. Product listings will appear as businesses join.</p><button className="button button-outline" onClick={() => { setQuery(''); setActiveCategory('all') }}>Clear filters</button></div>}
            </>
          )}
          {!supabase && <p className="demo-disclaimer">All business and product cards are clearly labeled illustrative examples. No real business contact details are displayed.</p>}
        </section>

        <section className="tourist-panel">
          <div className="tourist-symbol">✳</div><div><p className="eyebrow">A LITTLE LOCAL GOES A LONG WAY</p><h2>Visiting Mamburao?</h2><p>Find useful local spots, check seller-provided hours, and contact a business to confirm details before you go.</p></div>
          <a className="button button-light" href="#explore">Start exploring →</a>
        </section>

        <section className="seller-promo" id="seller">
          <div className="seller-promo-icon">⌂</div>
          <div><p className="eyebrow">FOR LOCAL BUSINESS OWNERS</p><h2>Help more people find you.</h2><p>Register your business and share your products with the Mamburao community. Listings are reviewed before they become public.</p></div>
          <button className="button button-green" onClick={() => session ? document.getElementById('seller-tools')?.scrollIntoView({ behavior: 'smooth' }) : setAuthOpen(true)}>{session ? 'Seller dashboard' : 'Register your business'} <span>→</span></button>
        </section>

        {session && (
          <section className="account-section" id="seller-tools">
            <div className="section-heading"><div><p className="eyebrow">YOUR ACCOUNT</p><h2>{profileLoading ? 'Loading your workspace…' : profile?.role === 'admin' ? 'Administrator workspace' : profile?.role === 'seller' ? 'Seller workspace' : 'Buyer dashboard'}</h2></div></div>
            {profileLoading ? <div className="empty-panel">Loading your account details…</div> : profile?.role === 'admin' ? (
              <div className="admin-workspace">
                <div className="stats-grid"><div><strong>{adminStats.businesses}</strong><span>Business listings</span></div><div><strong>{adminStats.products}</strong><span>Product listings</span></div><div><strong>{adminStats.sellers}</strong><span>Seller accounts</span></div></div>
                <h3>Pending seller applications</h3>
                {adminQueue.applications.length ? adminQueue.applications.map((application) => <div className="queue-card" key={application.id}><div><strong>{application.business_name}</strong><p>{application.description} · {application.address} · {application.operating_hours || 'Hours not provided'}</p><small>{application.contact_email || application.phone}</small></div><div className="queue-actions"><button className="button button-green button-small" onClick={() => decideApplication(application.id, true)}>Approve seller</button><button className="button button-outline button-small" onClick={() => decideApplication(application.id, false)}>Decline</button></div></div>) : <p className="empty-copy">No seller applications pending.</p>}
                <h3>Pending businesses</h3>
                {adminQueue.businesses.length ? adminQueue.businesses.map((business) => <div className="queue-card" key={business.id}><div><strong>{business.name}</strong><p>{business.description} · {business.address}</p></div><div className="queue-actions"><button className="button button-green button-small" onClick={() => moderate('businesses', business.id, 'approved')}>Approve</button><button className="button button-outline button-small" onClick={() => moderate('businesses', business.id, 'rejected')}>Reject</button></div></div>) : <p className="empty-copy">No businesses pending review.</p>}
                <h3>Pending products</h3>
                {adminQueue.products.length ? adminQueue.products.map((product) => <div className="queue-card moderation-product" key={product.id}>
                  {product.imageUrl ? <img className="moderation-photo" src={product.imageUrl} alt={`Submitted photo of ${product.name}`} /> : <div className="moderation-photo-missing">Photo required</div>}
                  <div><strong>{product.name}</strong><p>{product.businesses?.name} · {product.description} · {formatPrice(product.price)}</p></div>
                  <div className="queue-actions"><button className="button button-green button-small" disabled={!product.imageUrl} title={!product.imageUrl ? 'A photo is required before approval' : ''} onClick={() => moderate('products', product.id, 'approved')}>Approve</button><button className="button button-outline button-small" onClick={() => moderate('products', product.id, 'rejected')}>Reject</button></div>
                </div>) : <p className="empty-copy">No products pending review.</p>}
                <h3>Homepage featured listings</h3>
                {adminQueue.approvedBusinesses.map((business) => <div className="queue-card" key={business.id}><strong>{business.name}<small>Business</small></strong><button className="button button-outline button-small" onClick={() => toggleFeatured('businesses', business)}>{business.is_featured ? 'Remove feature' : 'Feature business'}</button></div>)}
                {adminQueue.approvedProducts.map((product) => <div className="queue-card" key={product.id}><strong>{product.name}<small>{product.businesses?.name || 'Product'}</small></strong><button className="button button-outline button-small" onClick={() => toggleFeatured('products', product)}>{product.is_featured ? 'Remove feature' : 'Feature product'}</button></div>)}
                <h3>Manage categories</h3>
                <form className="inline-form" onSubmit={addCategory}><label className="sr-only" htmlFor="new-category">New category name</label><input id="new-category" required maxLength="80" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="New category name" /><button className="button button-green button-small">Add category</button></form>
                <div className="category-admin-list">{adminQueue.categories.map((category) => <div className="queue-card" key={category.id}><strong>{category.name}<small>{category.is_active ? 'Active' : 'Hidden'}</small></strong><button className="button button-outline button-small" onClick={() => toggleCategory(category)}>{category.is_active ? 'Hide category' : 'Enable category'}</button></div>)}</div>
                <h3>Manage user roles</h3>
                {adminQueue.profiles.map((account) => <div className="queue-card" key={account.id}><div><strong>{account.full_name || 'New account'}</strong><small>{account.id}</small></div><div className="role-controls"><span>{account.role}</span><button className="button button-outline button-small" disabled={account.role === 'seller' || account.role === 'admin'} onClick={() => changeUserRole(account.id, 'seller')}>Make seller</button><button className="button button-outline button-small" disabled={account.role !== 'seller'} onClick={() => changeUserRole(account.id, 'buyer')}>Make buyer</button></div></div>)}
              </div>
            ) : profile?.role === 'seller' ? (
              <div className="seller-workspace">
                <h3>Your businesses</h3>
                {sellerBusinesses.map((business) => <div className="queue-card" key={business.id}><div><strong>{business.name}</strong><p>Listing status: {business.status}</p></div><button className="button button-outline button-small" onClick={() => { setEditingBusinessId(business.id); setBusinessForm({ business_name: business.name, description: business.description, category_id: business.category_id, address: business.address, phone: business.phone || '', contact_email: business.contact_email || '', operating_hours: business.operating_hours || '' }); setBusinessImage(null) }}>Edit profile</button></div>)}
                <h3>{editingBusinessId ? 'Edit business profile' : 'Add a business profile'}</h3>
                <form className="stack-form seller-form" onSubmit={saveSellerBusiness}>
                  <label>Business name<input required maxLength="120" value={businessForm.business_name} onChange={(event) => setBusinessForm({ ...businessForm, business_name: event.target.value })} /></label>
                  <label>Category<select required value={businessForm.category_id} onChange={(event) => setBusinessForm({ ...businessForm, category_id: event.target.value })}><option value="">Choose a category</option>{categories.filter((category) => category.uuid).map((category) => <option key={category.uuid} value={category.uuid}>{category.label}</option>)}</select></label>
                  <label>Description<textarea required maxLength="1000" value={businessForm.description} onChange={(event) => setBusinessForm({ ...businessForm, description: event.target.value })} /></label>
                  <label>Address or location<input required maxLength="250" value={businessForm.address} onChange={(event) => setBusinessForm({ ...businessForm, address: event.target.value })} /></label>
                  <label>Operating hours<input maxLength="250" value={businessForm.operating_hours} onChange={(event) => setBusinessForm({ ...businessForm, operating_hours: event.target.value })} /></label>
                  <label>Contact number<input type="tel" maxLength="40" value={businessForm.phone} onChange={(event) => setBusinessForm({ ...businessForm, phone: event.target.value })} /></label>
                  <label>Contact email<input type="email" maxLength="254" value={businessForm.contact_email} onChange={(event) => setBusinessForm({ ...businessForm, contact_email: event.target.value })} /></label>
                  <label>Business photo (JPG, PNG, or WebP; 5 MB max)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setBusinessImage(event.target.files?.[0] || null)} /></label>
                  <div className="form-actions"><button className="button button-green">{editingBusinessId ? 'Resubmit for review' : 'Submit business for review'}</button>{editingBusinessId && <button type="button" className="button button-outline" onClick={() => { setEditingBusinessId(''); setBusinessForm({ business_name: '', description: '', category_id: '', address: '', phone: '', contact_email: '', operating_hours: '' }) }}>Cancel edit</button>}</div>
                </form>
                <h3>Add a product listing</h3>
                {sellerBusinesses.some((business) => business.status === 'approved') ? (
                  <form className="stack-form seller-form" onSubmit={submitProduct}>
                    <label>Business<select required value={productForm.business_id} onChange={(event) => setProductForm({ ...productForm, business_id: event.target.value })}><option value="">Choose a business</option>{sellerBusinesses.filter((business) => business.status === 'approved').map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>
                    <label>Product name<input required maxLength="100" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
                    <label>Description<textarea required maxLength="1000" value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label>
                    <label>Category<select required value={productForm.category_id} onChange={(event) => setProductForm({ ...productForm, category_id: event.target.value })}><option value="">Choose a category</option>{categories.filter((category) => category.uuid).map((category) => <option key={category.uuid} value={category.uuid}>{category.label}</option>)}</select></label>
                    <label>Price (PHP)<input required type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label>
                    <label>Product photo (required — JPG, PNG, or WebP; 5 MB max)<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectProductImage(event.target.files?.[0] || null)} /></label>
                    {productImagePreview && <div className="product-upload-preview"><img src={productImagePreview} alt="Preview of the selected product photo" /><span>Preview · this photo will be shown on the product card after approval</span></div>}
                    <button className="button button-green">Submit for review</button>
                  </form>
                ) : <p className="empty-copy">Your business must be approved before you can list products.</p>}
                <h3>Your products</h3>
                {sellerProducts.length ? sellerProducts.map((product) => <div className="queue-card" key={product.id}><div><strong>{product.name}</strong><p>Listing status: {product.status}</p></div><label className="availability-toggle"><input type="checkbox" checked={product.available} onChange={(event) => changeAvailability(product.id, event.target.checked)} /> Available</label></div>) : <p className="empty-copy">No product listings yet.</p>}
              </div>
            ) : (
              <div className="seller-workspace">
                <div className="buyer-overview">
                  <p className="eyebrow">BUYER ACCOUNT</p>
                  <h3>Kumusta{profile?.full_name ? `, ${profile.full_name}` : ''}!</h3>
                  <p>Browse approved local businesses and products, then contact sellers directly using their listing details.</p>
                  <div className="buyer-actions"><button className="button button-green" onClick={() => { setShowDashboard(false); window.setTimeout(() => document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' }), 0) }}>Explore listings</button><a className="button button-outline" href="#seller-application">Register my business</a></div>
                </div>
                <div id="seller-application">
                {sellerApplication ? <p className="review-note">Your application for <strong>{sellerApplication.business_name}</strong> is pending administrator review. You can submit another application after this one is reviewed.</p> : <>
                <p className="review-note">Seller applications are reviewed before a listing is published. Only administrator-approved information appears in the public directory.</p>
                <form className="stack-form seller-form" onSubmit={submitSellerApplication}>
                  <label>Business name<input required maxLength="120" value={businessForm.business_name} onChange={(event) => setBusinessForm({ ...businessForm, business_name: event.target.value })} /></label>
                  <label>Category<select required value={businessForm.category_id} onChange={(event) => setBusinessForm({ ...businessForm, category_id: event.target.value })}><option value="">Choose a category</option>{categories.filter((category) => category.uuid).map((category) => <option key={category.uuid} value={category.uuid}>{category.label}</option>)}</select></label>
                  <label>Description<textarea required maxLength="1000" value={businessForm.description} onChange={(event) => setBusinessForm({ ...businessForm, description: event.target.value })} /></label>
                  <label>Address or location<input required maxLength="250" value={businessForm.address} onChange={(event) => setBusinessForm({ ...businessForm, address: event.target.value })} /></label>
                  <label>Operating hours<input maxLength="250" value={businessForm.operating_hours} onChange={(event) => setBusinessForm({ ...businessForm, operating_hours: event.target.value })} /></label>
                  <label>Contact number<input type="tel" maxLength="40" value={businessForm.phone} onChange={(event) => setBusinessForm({ ...businessForm, phone: event.target.value })} /></label>
                  <label>Contact email<input type="email" maxLength="254" value={businessForm.contact_email} onChange={(event) => setBusinessForm({ ...businessForm, contact_email: event.target.value })} /></label>
                  <button className="button button-green">Send seller application</button>
                </form>
                </>}
                </div>
              </div>
            )}
          </section>
        )}

        <section className="about-section" id="about"><div><p className="eyebrow">MADE FOR MAMBURAO</p><h2>Local businesses deserve<br />to be easy to find.</h2></div><p>Mamburao Lokal brings local businesses, products, and services together in one organized place. Listings are published only after review, helping residents and visitors discover the community with confidence.</p></section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#home"><span className="brand-mark">M</span><span>Mamburao <b>Lokal</b><small>LOCAL FINDS, CLOSE TO HOME</small></span></a>
        <p>Discover local. Support local.</p>
        <div className="footer-links"><a href="#explore">Explore</a><a href="#categories">Categories</a><a href="#seller">For business owners</a><span>Contact sellers through their approved listing details</span></div>
        <small className="footer-disclaimer">A community discovery platform · Verify listing details directly with the business.</small>
      </footer>
      {selectedItem && <DetailDialog item={selectedItem} type={selectedItem.type} onClose={() => setSelectedItem(null)} />}
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onAuthenticated={handleAuth} />}
    </>
  )
}

export default App
