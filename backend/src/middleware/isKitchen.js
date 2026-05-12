module.exports = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'kitchen')
    return res.status(403).json({ message: 'Kitchen access only' });
  next();
};
