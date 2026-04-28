const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');

const isOwner = (tournament, user) =>
  user.role === 'ADMIN' || tournament.organizerId === user.id;

const listTeams = async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      where: { tournamentId: req.params.id },
      include: { _count: { select: { players: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: teams });
  } catch (err) {
    next(err);
  }
};

const createTeam = async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: req.params.id } });
    if (!tournament) return res.status(404).json({ success: false, error: 'Torneo non trovato.' });
    if (!isOwner(tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });
    if (tournament.status === 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Impossibile aggiungere squadre a un torneo completato.' });
    }

    const team = await prisma.team.create({
      data: { name: req.body.name, tournamentId: req.params.id },
    });
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
};

const updateTeam = async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.teamId },
      include: { tournament: true },
    });
    if (!team) return res.status(404).json({ success: false, error: 'Squadra non trovata.' });
    if (!isOwner(team.tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });

    const updated = await prisma.team.update({
      where: { id: req.params.teamId },
      data: { name: req.body.name },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const deleteTeam = async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.teamId },
      include: { tournament: true },
    });
    if (!team) return res.status(404).json({ success: false, error: 'Squadra non trovata.' });
    if (!isOwner(team.tournament, req.user)) return res.status(403).json({ success: false, error: 'Permesso negato.' });
    if (team.tournament.status === 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Impossibile rimuovere squadre da un torneo attivo.' });
    }

    await prisma.team.delete({ where: { id: req.params.teamId } });
    res.json({ success: true, message: 'Squadra eliminata.' });
  } catch (err) {
    next(err);
  }
};

const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Nessun file caricato.' });

    const team = await prisma.team.findUnique({
      where: { id: req.params.teamId },
      include: { tournament: true },
    });
    if (!team) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Squadra non trovata.' });
    }
    if (!isOwner(team.tournament, req.user)) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, error: 'Permesso negato.' });
    }

    // Remove old logo file
    if (team.logo) {
      const oldPath = path.join(__dirname, '..', '..', team.logo.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const updated = await prisma.team.update({
      where: { id: req.params.teamId },
      data: { logo: `/uploads/logos/${req.file.filename}` },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = { listTeams, createTeam, updateTeam, deleteTeam, uploadLogo };
