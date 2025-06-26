const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: Call external KYC API (stubbed for now)
async function callKycApi(kycData) {
  // TODO: Integrate with Karza/Signzy/AuthBridge
  // For now, return the data as-is
  console.log('Calling KYC API with:', kycData);
  return kycData;
}

// POST /api/kyc/link-identity -- Link KYC identity to wallet
router.post('/link-identity', async (req, res) => {
  try {
    const { wallet, pan, aadhaar, name, dob, address, manual, linked_by } = req.body;
    
    if (!wallet || (!pan && !aadhaar)) {
      return res.status(400).json({ error: 'Wallet address and either PAN or Aadhaar are required' });
    }

    let kycData = { pan, aadhaar, name, dob, address };

    // If not manual, call external KYC API
    if (!manual) {
      try {
        kycData = await callKycApi(kycData);
      } catch (apiError) {
        console.error('KYC API error:', apiError);
        return res.status(500).json({ error: 'Failed to fetch KYC data from external API' });
      }
    }

    // Upsert KYCIdentity (create or update)
    let kycIdentity;
    if (pan) {
      kycIdentity = await prisma.kYCIdentity.upsert({
        where: { pan },
        update: kycData,
        create: kycData,
      });
    } else if (aadhaar) {
      kycIdentity = await prisma.kYCIdentity.upsert({
        where: { aadhaar },
        update: kycData,
        create: kycData,
      });
    }

    // Link wallet to KYC
    const link = await prisma.walletKYCLink.create({
      data: {
        wallet: wallet.toLowerCase(),
        kyc_id: kycIdentity.id,
        linked_by,
      },
      include: {
        kycIdentity: true,
      },
    });

    res.status(201).json({
      message: 'KYC identity linked successfully',
      link,
      kycIdentity,
    });
  } catch (err) {
    console.error('Link KYC error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kyc/wallet/:wallet -- Get all KYC identities linked to a wallet
router.get('/wallet/:wallet', async (req, res) => {
  try {
    const links = await prisma.walletKYCLink.findMany({
      where: { wallet: req.params.wallet.toLowerCase() },
      include: {
        kycIdentity: true,
      },
      orderBy: { linked_at: 'desc' },
    });

    res.json({
      wallet: req.params.wallet,
      linkedIdentities: links.map(link => ({
        ...link.kycIdentity,
        linkedAt: link.linked_at,
        linkedBy: link.linked_by,
      })),
      count: links.length,
    });
  } catch (err) {
    console.error('Get wallet KYC error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kyc/identity/:id -- Get KYC identity by ID
router.get('/identity/:id', async (req, res) => {
  try {
    const kycIdentity = await prisma.kYCIdentity.findUnique({
      where: { id: req.params.id },
      include: {
        walletLinks: {
          orderBy: { linked_at: 'desc' },
        },
      },
    });

    if (!kycIdentity) {
      return res.status(404).json({ error: 'KYC identity not found' });
    }

    res.json(kycIdentity);
  } catch (err) {
    console.error('Get KYC identity error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/kyc/link/:id -- Remove KYC link
router.delete('/link/:id', async (req, res) => {
  try {
    await prisma.walletKYCLink.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'KYC link removed successfully' });
  } catch (err) {
    console.error('Remove KYC link error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 