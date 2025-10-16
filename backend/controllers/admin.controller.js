import AdminProfile from "../models/admin.model.js";
import cloudinary from "../lib/cloudinary.js";

// Criar novo produto
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category, produtoV, stock, isFeatured } = req.body;

    // Validações
    if (!name || !description || !price || !image || !category || !produtoV) {
      return res.status(400).json({ message: "Nome, descrição, preço, imagem, categoria e tipo de produto são obrigatórios" });
    }

    if (price < 0) {
      return res.status(400).json({ message: "Preço não pode ser negativo"});
    }

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id });

    if (!adminProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" })
    }

    if (adminProfile.verificationStatus !== "approved") {
      return res.status(403).json({message: "Seu perfil precisa estar aprovado para adicionar produtos"})
    }

    // Upload da imagem para o Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "products",
      transformation: [
        { width: 800, height: 800, crop: "limit" },
        { quality: "auto", fetch_format: "auto" }
      ]
    })

    const productData = {
      name,
      description,
      price,
      image: uploadResponse.secure_url,
      category,
      produtoV,
      stock: stock || 0,
      isFeatured: isFeatured || false,
    }

    const newProduct = await adminProfile.addProduct(productData)

    res.status(201).json({message: "Produto criado com sucesso", product: newProduct})

  } catch (error) {
    console.log("Erro ao criar produto:", error)
    res.status(500).json({message: "Erro ao criar produto", error: error.message});
  }
}

// Buscar todos os produtos do vendedor
export const getMyProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, produtoV, isActive, search } = req.query

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id })

    if (!adminProfile) {
      return res.status(404).json({message: "Perfil de vendedor não encontrado"})
    }

    let products = adminProfile.products

    // Filtros
    if (category) {
      products = products.filter(p => p.category === category)
    }

    if (produtoV) {
      products = products.filter(p => p.produtoV === produtoV)
    }

    if (isActive !== undefined) {
      products = products.filter(p => p.isActive === (isActive === "true"))
    }

    if (search) {
      const searchLower = search.toLowerCase()
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      )
    }

    // Ordenar por data 
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Paginação
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const paginatedProducts = products.slice(startIndex, endIndex)

    res.json({
      products: paginatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(products.length / limit),
        totalProducts: products.length,
        hasNextPage: endIndex < products.length,
        hasPrevPage: page > 1,
      }
    })

  } catch (error) {
    console.log("Erro ao buscar produtos:", error)
    res.status(500).json({message: "Erro ao buscar produtos", error: error.message})
  }
}

// Buscar um produto específico
export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id })

    if (!adminProfile) {
      return res.status(404).json({message: "Perfil de vendedor não encontrado"})
    }

    const product = adminProfile.products.id(productId)

    if (!product) {
      return res.status(404).json({message: "Produto não encontrado"})
    }

    res.json({ product })

  } catch (error) {
    console.log("Erro ao buscar produto:", error)
    res.status(500).json({message: "Erro ao buscar produto", error: error.message})
  }
}

// Atualizar produto
export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params
    const { name, description, price, image, category, produtoV, stock, isFeatured, isActive } = req.body

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id })

    if (!adminProfile) {
      return res.status(404).json({message: "Perfil de vendedor não encontrado"})
    }

    const product = adminProfile.products.id(productId)

    if (!product) {
      return res.status(404).json({message: "Produto não encontrado"})
    }

    // Atualizar imagem se fornecida
    let imageUrl = product.image
    if (image && image !== product.image) {
      // Deletar imagem antiga
      const publicId = product.image.split('/').pop().split(".")[0]
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`)
      } catch (error) {
        console.log("Erro ao deletar imagem antiga:", error)
      }

      // Upload nova imagem
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
        transformation: [
          { width: 800, height: 800, crop: "limit" },
          { quality: "auto", fetch_format: "auto" }
        ]
      });
      imageUrl = uploadResponse.secure_url
    }

    const updateData = {
      name: name || product.name,
      description: description || product.description,
      price: price !== undefined ? price : product.price,
      image: imageUrl,
      category: category || product.category,
      produtoV: produtoV || product.produtoV,
      stock: stock !== undefined ? stock : product.stock,
      isFeatured: isFeatured !== undefined ? isFeatured : product.isFeatured,
      isActive: isActive !== undefined ? isActive : product.isActive,
    }

    const updatedProduct = await adminProfile.updateProduct(productId, updateData)

    res.json({message: "Produto atualizado com sucesso",product: updatedProduct})

  } catch (error) {
    console.log("Erro ao atualizar produto:", error);
    res.status(500).json({message: "Erro ao atualizar produto", error: error.message})
  }
}

// Deletar produto (soft delete)
export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id })

    if (!adminProfile) {
      return res.status(404).json({message: "Perfil de vendedor não encontrado"})
    }

    await adminProfile.deleteProduct(productId);

    res.json({message: "Produto desativado com sucesso"})

  } catch (error) {
    console.log("Erro ao deletar produto:", error);
    res.status(500).json({message: error.message || "Erro ao deletar produto", error: error.message})
  }
}

// Atualizar estoque
export const updateStock = async (req, res) => {
  try {
    const { productId } = req.params
    const { stock } = req.body

    if (stock === undefined || stock < 0) {
      return res.status(400).json({message: "Estoque inválido"})
    }

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id })

    if (!adminProfile) {
      return res.status(404).json({message: "Perfil de vendedor não encontrado"})
    }

    const product = adminProfile.products.id(productId)

    if (!product) {
      return res.status(404).json({message: "Produto não encontrado"})
    }

    product.stock = stock
    await adminProfile.save()

    res.json({message: "Estoque atualizado com sucesso", product})

  } catch (error) {
    console.log("Erro ao atualizar estoque:", error)
    res.status(500).json({message: "Erro ao atualizar estoque", error: error.message})
  }
}

// ============================================
// BUSCAR PRODUTOS PÚBLICOS (Para clientes)
// ============================================

// Buscar todos os produtos ativos de um vendedor específico
export const getVendorProducts = async (req, res) => {
  try {
    const { vendorId } = req.params
    const { page = 1, limit = 20, category, produtoV, search } = req.query

    const adminProfile = await AdminProfile.findOne({ 
      userId: vendorId,
      verificationStatus: "approved",
      isActive: true 
    });

    if (!adminProfile) {
      return res.status(404).json({message: "Vendedor não encontrado"})
    }

    let products = adminProfile.products.filter(p => p.isActive)

    // Filtros
    if (category) {
      products = products.filter(p => p.category === category)
    }

    if (produtoV) {
      products = products.filter(p => p.produtoV === produtoV)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      )
    }

    // Ordenar por destaque e data
    products.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1
      if (!a.isFeatured && b.isFeatured) return 1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    // Paginação
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const paginatedProducts = products.slice(startIndex, endIndex)

    res.json({
      vendor: {
        storeName: adminProfile.storeName,
        storeDescription: adminProfile.storeDescription,
        rating: adminProfile.rating,
        totalReviews: adminProfile.totalReviews,
      },
      products: paginatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(products.length / limit),
        totalProducts: products.length,
        hasNextPage: endIndex < products.length,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar produtos do vendedor:", error)
    res.status(500).json({message: "Erro ao buscar produtos", error: error.message})
  }
}

// Buscar todos os produtos ativos da plataforma
export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, produtoV, search, isFeatured } = req.query

    const adminProfiles = await AdminProfile.find({ 
      verificationStatus: "approved",
      isActive: true 
    })

    let allProducts = [];

    // Coletar todos os produtos ativos de todos os vendedores
    adminProfiles.forEach(profile => {
      const activeProducts = profile.products
        .filter(p => p.isActive)
        .map(p => ({
          ...p.toObject(),
          vendor: {
            id: profile.userId,
            storeName: profile.storeName,
            rating: profile.rating,
          }
        }));
      allProducts = allProducts.concat(activeProducts)
    })

    // Filtros
    if (category) {
      allProducts = allProducts.filter(p => p.category === category)
    }

    if (produtoV) {
      allProducts = allProducts.filter(p => p.produtoV === produtoV)
    }

    if (isFeatured === "true") {
      allProducts = allProducts.filter(p => p.isFeatured)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      allProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      )
    }

    // Ordenar por destaque e data
    allProducts.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1
      if (!a.isFeatured && b.isFeatured) return 1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    // Paginação
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const paginatedProducts = allProducts.slice(startIndex, endIndex)

    res.json({
      products: paginatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(allProducts.length / limit),
        totalProducts: allProducts.length,
        hasNextPage: endIndex < allProducts.length,
        hasPrevPage: page > 1,
      }
    })

  } catch (error) {
    console.log("Erro ao buscar produtos:", error)
    res.status(500).json({message: "Erro ao buscar produtos", error: error.message})
  }
}

// Buscar detalhes de um produto específico (público)
export const getProductDetails = async (req, res) => {
  try {
    const { productId } = req.params

    // Buscar em todos os vendedores aprovados
    const adminProfiles = await AdminProfile.find({ 
      verificationStatus: "approved",
      isActive: true 
    })

    let foundProduct = null
    let vendorInfo = null

    for (const profile of adminProfiles) {
      const product = profile.products.id(productId)
      if (product && product.isActive) {
        foundProduct = product
        vendorInfo = {
          id: profile.userId,
          storeName: profile.storeName,
          storeDescription: profile.storeDescription,
          rating: profile.rating,
          totalReviews: profile.totalReviews,
          totalSales: profile.totalSales,
        }
        
        // Incrementar views
        product.views += 1
        await profile.save()
        break
      }
    }

    if (!foundProduct) {
      return res.status(404).json({message: "Produto não encontrado"})
    }

    res.json({product: foundProduct,vendor: vendorInfo})

  } catch (error) {
    console.log("Erro ao buscar detalhes do produto:", error)
    res.status(500).json({message: "Erro ao buscar produto", error: error.message})
  }
}