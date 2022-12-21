const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint

// get all products
router.get('/', async (req, res) => {
  // find all products
  // be sure to include its associated Category and Tag data
  try {
    const products = await Product.findAll({
      include: [{ model: Category }, { model: Tag, through: ProductTag }]
    });

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json(err);
  }
});

// get one product
router.get('/:id', async (req, res) => {
  // find a single product by its `id`
  // be sure to include its associated Category and Tag data
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category }, { model: Tag, through: ProductTag }]
    });

    res.status(200).json(product);
  } catch (err) {
    res.status(500).json(err);
  }
});

// create new product
router.post('/', async (req, res) => {
  try {
    const product = await Product.create(req.body);
      
    // if there's product tags, we need to create pairings to bulk create in the ProductTag model
    if (req.body.tags.length) {
      const productTagIdArr = req.body.tags.map((tag_id) => {
        return {
          product_id: product.id,
          tag_id,
        };
      });
      
      const productTagIds = ProductTag.bulkCreate(productTagIdArr);
      
      res.status(200).json({ productTagIds, message: "It has been updated." });
      return;
    }
    
    // if no product tags, just respond
    res.status(200).json(product, {message: "No Product Tags are tied to this Product."});
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

// update product
router.put('/:id', async (req, res) => {
  try {
    // update product data
    const product = await Product.update(req.body, {
      where: {
        id: req.params.id,
      },
    });
    
    if (req.body.tags) {
      // find all associated tags from ProductTag
      const productTags = await ProductTag.findAll({ where: { product_id: req.params.id } });
      
      // get list of current tag_ids
      const productTagIds = productTags.map(({ tag_id }) => tag_id);
      
      // create filtered list of new tag_ids
      const newProductTags = req.body.tags
        .filter((tag_id) => !productTagIds.includes(tag_id))
        .map((tag_id) => {
          return {
            product_id: req.params.id,
            tag_id
          };
        });
      
      // figure out which ones to remove
      const productTagsToRemove = productTags
        .filter(({ tag_id }) => !req.body.tags.includes(tag_id))
        .map(({ id }) => id);

      // run both actions
      const updatedProductTags = await Promise.all([
        ProductTag.destroy({ where: { id: productTagsToRemove } }),
        ProductTag.bulkCreate(newProductTags)
      ]);
      
      res.status(200).json(updatedProductTags);
      return;
    }
    
    res.status(200).json(product);
  } catch (err) {
    console.error(err);
    res.status(400).json(err);
  }
});

router.delete('/:id', async (req, res) => {
  // delete one product by its `id` value
  try {
    const destroyed = await Product.destroy({
      where: {
        id: req.params.id
      }
    });

    if (!destroyed) {
      res.status(404).json({ message: 'There is no product with the provided ID.' })
    }

    res.status(200).json(destroyed);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
